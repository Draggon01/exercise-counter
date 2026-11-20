package org.exercise.counter.exercisecounter.account;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

/** DELETE /api/account over HTTP: the JSON body the frontend sends, and every session of the user ends. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class DeleteAccountEndpointTest {

    private static final String USER = "delete-me";

    @LocalServerPort
    int port;

    @Autowired private UserRepository userRepository;

    @AfterEach
    void cleanup() {
        userRepository.findByUsername(USER).ifPresent(userRepository::delete);
    }

    @Test
    void deletingTheAccount_logsOutOnAllDevices() throws Exception {
        userRepository.save(new User(USER, "{noop}secret-password"));
        try (HttpClient phone = loggedIn(); HttpClient laptop = loggedIn()) {
            assertEquals(200, send(laptop, "GET", "/api/options", null).statusCode());

            assertEquals(400, send(phone, "DELETE", "/api/account", "{\"password\":\"wrong\"}").statusCode());
            assertEquals(204, send(phone, "DELETE", "/api/account", "{\"password\":\"secret-password\"}").statusCode());

            assertTrue(userRepository.findByUsername(USER).isEmpty());
            assertEquals(401, send(phone, "GET", "/api/options", null).statusCode(), "this device");
            assertEquals(401, send(laptop, "GET", "/api/options", null).statusCode(), "other device");
        }
    }

    private HttpClient loggedIn() throws Exception {
        HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> login = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=" + USER + "&password=secret-password"))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, login.statusCode());
        return client;
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String json) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (json != null) {
            request.header("Content-Type", "application/json");
        }
        request.method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
