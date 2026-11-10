package org.exercise.counter.exercisecounter.web.service.push;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.KeyPair;
import java.security.interfaces.ECPublicKey;

@Configuration
@EnableConfigurationProperties(PushProperties.class)
public class PushConfig {

    private static final Logger log = LoggerFactory.getLogger(PushConfig.class);

    /** Without keys reminders are off – log a fresh key pair so turning them on is copy & paste. */
    @Bean
    public ApplicationRunner pushKeysHint(PushProperties properties) {
        return args -> {
            if (properties.enabled()) {
                log.info("Push reminders enabled");
                return;
            }
            KeyPair keys = WebPushCrypto.generateKeyPair();
            log.info("""
                    Push reminders are off (no VAPID keys). To turn them on, set once and keep forever \
                    (new keys invalidate all subscriptions):
                      APP_PUSH_PUBLIC_KEY={}
                      APP_PUSH_PRIVATE_KEY={}
                      APP_PUSH_SUBJECT=mailto:<your address> (or https://<your site>)""",
                    WebPushCrypto.encode(WebPushCrypto.encodePoint((ECPublicKey) keys.getPublic())),
                    WebPushCrypto.encode(WebPushCrypto.encodePrivate(keys.getPrivate())));
        };
    }
}
