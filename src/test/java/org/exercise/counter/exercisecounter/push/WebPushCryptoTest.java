package org.exercise.counter.exercisecounter.push;

import org.exercise.counter.exercisecounter.web.service.push.WebPushCrypto;
import org.junit.jupiter.api.Test;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;

import static org.exercise.counter.exercisecounter.web.service.push.WebPushCrypto.*;
import static org.junit.jupiter.api.Assertions.*;

class WebPushCryptoTest {

    // RFC 8291, Appendix A
    private static final String PLAINTEXT = "When I grow up, I want to be a watermelon";
    private static final String AS_PUBLIC = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String AS_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private static final String UA_PUBLIC = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String UA_PRIVATE = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
    private static final String SALT = "DGv6ra1nlYgDCS1FRnbzlw";
    private static final String AUTH_SECRET = "BTBZMqHH6r4Tts7J_aSIgg";
    private static final String EXPECTED_BODY = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";

    @Test
    void encrypt_matchesTheRfc8291TestVector() throws Exception {
        KeyPair serverKeys = new KeyPair(publicKey(decode(AS_PUBLIC)), privateKey(decode(AS_PRIVATE)));

        byte[] body = encryptWith(PLAINTEXT.getBytes(StandardCharsets.UTF_8), decode(UA_PUBLIC), decode(AUTH_SECRET),
                serverKeys, decode(SALT));

        assertEquals(EXPECTED_BODY, encode(body));
    }

    @Test
    void encrypt_canBeDecryptedByTheBrowser() throws Exception {
        KeyPair browser = generateKeyPair();
        byte[] auth = new byte[16];
        Arrays.fill(auth, (byte) 7);
        byte[] message = "{\"title\":\"Push-ups\"}".getBytes(StandardCharsets.UTF_8);

        byte[] body = WebPushCrypto.encrypt(message, encode(encodePoint((ECPublicKey) browser.getPublic())), encode(auth));

        assertArrayEquals(message, decrypt(body, browser, auth));
    }

    @Test
    void keysSurviveTheBase64RoundTrip() {
        KeyPair keys = generateKeyPair();
        byte[] point = encodePoint((ECPublicKey) keys.getPublic());
        byte[] scalar = encodePrivate(keys.getPrivate());

        assertEquals(65, point.length);
        assertEquals(32, scalar.length);
        assertEquals(keys.getPublic(), publicKey(decode(encode(point))));
        assertArrayEquals(scalar, encodePrivate(privateKey(decode(encode(scalar)))));
    }

    @Test
    void sign_producesA64ByteSignatureTheJdkVerifies() throws Exception {
        KeyPair keys = generateKeyPair();
        byte[] data = "header.claims".getBytes(StandardCharsets.US_ASCII);

        byte[] signature = sign(data, keys.getPrivate());

        assertEquals(64, signature.length);
        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(keys.getPublic());
        verifier.update(data);
        assertTrue(verifier.verify(signature));
    }

    @Test
    void publicKey_rejectsGarbage() {
        assertThrows(IllegalArgumentException.class, () -> publicKey(new byte[]{1, 2, 3}));
    }

    /** The package-private overload with fixed keys and salt. */
    private static byte[] encryptWith(byte[] plaintext, byte[] uaPublic, byte[] auth, KeyPair server, byte[] salt) throws Exception {
        Method method = WebPushCrypto.class.getDeclaredMethod("encrypt", byte[].class, byte[].class, byte[].class, KeyPair.class, byte[].class);
        method.setAccessible(true);
        return (byte[]) method.invoke(null, plaintext, uaPublic, auth, server, salt);
    }

    /** What the browser does (RFC 8291 from the receiving side) – written independently of the encryption code. */
    static byte[] decrypt(byte[] body, KeyPair browser, byte[] auth) throws Exception {
        ByteBuffer buffer = ByteBuffer.wrap(body);
        byte[] salt = new byte[16];
        buffer.get(salt);
        buffer.getInt(); // record size
        byte[] serverPublic = new byte[buffer.get()];
        buffer.get(serverPublic);
        byte[] ciphertext = new byte[buffer.remaining()];
        buffer.get(ciphertext);

        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(browser.getPrivate());
        agreement.doPhase(publicKey(serverPublic), true);
        byte[] uaPublic = encodePoint((ECPublicKey) browser.getPublic());

        byte[] ikm = hkdf(auth, agreement.generateSecret(), join("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, serverPublic), 32);
        byte[] cek = hkdf(salt, ikm, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = hkdf(salt, ikm, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] padded = cipher.doFinal(ciphertext);
        assertEquals(2, padded[padded.length - 1], "last record delimiter");
        return Arrays.copyOf(padded, padded.length - 1);
    }

    private static byte[] hkdf(byte[] salt, byte[] ikm, byte[] info, int length) throws Exception {
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(salt, "HmacSHA256"));
        byte[] prk = mac.doFinal(ikm);
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        return Arrays.copyOf(mac.doFinal(join(info, new byte[]{1})), length);
    }

    private static byte[] join(byte[]... parts) {
        int length = Arrays.stream(parts).mapToInt(p -> p.length).sum();
        ByteBuffer out = ByteBuffer.allocate(length);
        for (byte[] part : parts) out.put(part);
        return out.array();
    }
}
