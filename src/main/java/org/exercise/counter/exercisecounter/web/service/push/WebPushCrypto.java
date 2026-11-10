package org.exercise.counter.exercisecounter.web.service.push;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.util.Arrays;
import java.util.Base64;

/**
 * The cryptography of Web Push, built on the JDK only:
 * <ul>
 *     <li>message encryption with {@code aes128gcm} (RFC 8291 / RFC 8188)</li>
 *     <li>VAPID keys on the P-256 curve and the ES256 signature of the VAPID token (RFC 8292)</li>
 * </ul>
 * Keys are exchanged as base64url strings like browsers do: public keys as uncompressed points
 * (65 bytes, {@code 0x04 || x || y}), private keys as the 32 byte scalar.
 */
public final class WebPushCrypto {

    /** Record size written into the header; the message is always a single record. */
    private static final int RECORD_SIZE = 4096;
    private static final ECParameterSpec P256 = p256();
    private static final SecureRandom RANDOM = new SecureRandom();

    private WebPushCrypto() {
    }

    // ---- message encryption (RFC 8291)

    /**
     * Encrypts a push message for one subscription.
     *
     * @param plaintext the message (at most ~4 kB)
     * @param userAgentPublicKey the subscription's {@code p256dh} key (base64url)
     * @param authSecret the subscription's {@code auth} secret (base64url)
     * @return the request body for the push service ({@code Content-Encoding: aes128gcm})
     */
    public static byte[] encrypt(byte[] plaintext, String userAgentPublicKey, String authSecret) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return encrypt(plaintext, decode(userAgentPublicKey), decode(authSecret), generateKeyPair(), salt);
    }

    /** Encryption with a given ephemeral key pair and salt (the test vector of RFC 8291 uses fixed ones). */
    static byte[] encrypt(byte[] plaintext, byte[] userAgentPublic, byte[] authSecret, KeyPair serverKeys, byte[] salt) {
        try {
            byte[] serverPublic = encodePoint((ECPublicKey) serverKeys.getPublic());

            KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
            agreement.init(serverKeys.getPrivate());
            agreement.doPhase(publicKey(userAgentPublic), true);
            byte[] ecdhSecret = agreement.generateSecret();

            // combine the ECDH secret with the subscription's auth secret
            byte[] keyInfo = concat("WebPush: info".getBytes(StandardCharsets.US_ASCII), new byte[]{0},
                    userAgentPublic, serverPublic);
            byte[] ikm = hkdf(authSecret, ecdhSecret, keyInfo, 32);

            // content encryption key and nonce (RFC 8188)
            byte[] cek = hkdf(salt, ikm, concat("Content-Encoding: aes128gcm".getBytes(StandardCharsets.US_ASCII), new byte[]{0}), 16);
            byte[] nonce = hkdf(salt, ikm, concat("Content-Encoding: nonce".getBytes(StandardCharsets.US_ASCII), new byte[]{0}), 12);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
            // 0x02 = padding delimiter of the last (and only) record
            byte[] ciphertext = cipher.doFinal(concat(plaintext, new byte[]{2}));

            ByteBuffer header = ByteBuffer.allocate(16 + 4 + 1 + serverPublic.length);
            header.put(salt).putInt(RECORD_SIZE).put((byte) serverPublic.length).put(serverPublic);
            return concat(header.array(), ciphertext);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt push message", e);
        }
    }

    /** HKDF (RFC 5869) with SHA-256 for output lengths up to 32 bytes. */
    static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int length) throws GeneralSecurityException {
        byte[] prk = hmac(salt, ikm);
        return Arrays.copyOf(hmac(prk, concat(info, new byte[]{1})), length);
    }

    private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    // ---- VAPID (RFC 8292)

    /** ES256 signature of {@code data} (raw {@code r || s}, 64 bytes, as JWT expects it). */
    public static byte[] sign(byte[] data, PrivateKey privateKey) {
        try {
            Signature signature = Signature.getInstance("SHA256withECDSAinP1363Format");
            signature.initSign(privateKey);
            signature.update(data);
            return signature.sign();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not sign VAPID token", e);
        }
    }

    public static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(new ECGenParameterSpec("secp256r1"));
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 is not available", e);
        }
    }

    /** Public key from its uncompressed point (65 bytes). */
    public static PublicKey publicKey(byte[] uncompressedPoint) {
        if (uncompressedPoint.length != 65 || uncompressedPoint[0] != 4) {
            throw new IllegalArgumentException("Not an uncompressed P-256 point");
        }
        ECPoint point = new ECPoint(
                new BigInteger(1, Arrays.copyOfRange(uncompressedPoint, 1, 33)),
                new BigInteger(1, Arrays.copyOfRange(uncompressedPoint, 33, 65)));
        try {
            return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point, P256));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("Invalid P-256 public key", e);
        }
    }

    /** Private key from its 32 byte scalar. */
    public static PrivateKey privateKey(byte[] scalar) {
        try {
            return KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(new BigInteger(1, scalar), P256));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("Invalid P-256 private key", e);
        }
    }

    /** Uncompressed point ({@code 0x04 || x || y}) of a public key. */
    public static byte[] encodePoint(ECPublicKey key) {
        return concat(new byte[]{4}, unsigned32(key.getW().getAffineX()), unsigned32(key.getW().getAffineY()));
    }

    /** The 32 byte scalar of a private key. */
    public static byte[] encodePrivate(PrivateKey key) {
        return unsigned32(((java.security.interfaces.ECPrivateKey) key).getS());
    }

    // ---- helpers

    public static byte[] decode(String base64Url) {
        return Base64.getUrlDecoder().decode(base64Url.trim().replace("=", ""));
    }

    public static String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] unsigned32(BigInteger value) {
        byte[] bytes = value.toByteArray();
        byte[] result = new byte[32];
        int copy = Math.min(bytes.length, 32);
        System.arraycopy(bytes, bytes.length - copy, result, 32 - copy, copy);
        return result;
    }

    static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] part : parts) {
            out.writeBytes(part);
        }
        return out.toByteArray();
    }

    private static ECParameterSpec p256() {
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            return parameters.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 is not available", e);
        }
    }
}
