package org.exercise.counter.exercisecounter.security;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.security.StayLoggedIn;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

/** The session is gone (idle, deploy): the cookie logs in again, until the password changes or the user logs out. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class StayLoggedInTest {

    private static final String USER = "stay-user";

    @LocalServerPort int port;
    @Autowired private UserRepository userRepository;

    private final HttpClient client = HttpClient.newHttpClient(); // no cookie handler: cookies are sent explicitly

    @BeforeEach
    void setup() {
        userRepository.save(new User(USER, "{noop}old-password"));
    }

    @AfterEach
    void cleanup() {
        client.close();
        userRepository.findByUsername(USER).ifPresent(userRepository::delete);
    }

    @Test
    void cookieAlone_logsInAndIsRenewed() throws Exception {
        HttpResponse<String> login = login();
        String header = setCookie(login, StayLoggedIn.COOKIE);
        assertTrue(header.contains("HttpOnly"), header);
        assertTrue(header.contains("SameSite=Lax"), header);
        assertTrue(header.contains("Max-Age=" + StayLoggedIn.VALIDITY.toSeconds()), header);

        HttpResponse<String> again = send("GET", "/api/auth/check", cookie(login, StayLoggedIn.COOKIE), null);

        assertEquals(200, again.statusCode());
        assertNotNull(setCookie(again, StayLoggedIn.COOKIE), "renewed");
        // the new session works on its own
        assertEquals(200, send("GET", "/api/auth/check", cookie(again, "JSESSIONID"), null).statusCode());
    }

    @Test
    void forgedCookie_is401() throws Exception {
        assertEquals(401, send("GET", "/api/auth/check", StayLoggedIn.COOKIE + "=c3RheS11c2VyOjk5OTk5OTk5OTk5OTk6eA==", null).statusCode());
    }

    @Test
    void logout_removesTheCookie() throws Exception {
        HttpResponse<String> login = login();
        HttpResponse<String> logout = send("POST", "/api/logout", cookie(login, "JSESSIONID"), "");

        String removed = setCookie(logout, StayLoggedIn.COOKIE);
        assertTrue(removed.startsWith(StayLoggedIn.COOKIE + "=;") && removed.contains("1970"), removed);
    }

    @Test
    void changedPassword_invalidatesOtherDevices_butNotThisOne() throws Exception {
        HttpResponse<String> other = login();
        HttpResponse<String> here = login();

        HttpResponse<String> change = send("PUT", "/api/account/password", cookie(here, "JSESSIONID"),
                "{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password\"}");

        assertEquals(204, change.statusCode());
        assertEquals(401, send("GET", "/api/auth/check", cookie(other, StayLoggedIn.COOKIE), null).statusCode());
        assertEquals(200, send("GET", "/api/auth/check", cookie(change, StayLoggedIn.COOKIE), null).statusCode());
    }

    @Test
    void deletedAccount_endsSessionsThatCameFromTheCookie() throws Exception {
        HttpResponse<String> login = login();
        HttpResponse<String> other = send("GET", "/api/auth/check", cookie(login, StayLoggedIn.COOKIE), null);

        assertEquals(204, send("DELETE", "/api/account", cookie(login, "JSESSIONID"), "{\"password\":\"old-password\"}").statusCode());

        assertEquals(401, send("GET", "/api/auth/check", cookie(other, "JSESSIONID"), null).statusCode());
        assertEquals(401, send("GET", "/api/auth/check", cookie(login, StayLoggedIn.COOKIE), null).statusCode());
    }

    private HttpResponse<String> login() throws Exception {
        HttpResponse<String> response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=" + USER + "&password=old-password")).build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
        return response;
    }

    private HttpResponse<String> send(String method, String path, String cookie, String json) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Cookie", cookie).header("Content-Type", "application/json")
                .method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json))
                .build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String setCookie(HttpResponse<?> response, String name) {
        return response.headers().allValues("Set-Cookie").stream()
                .filter(header -> header.startsWith(name + "=")).reduce((a, b) -> b).orElse(null);
    }

    private static String cookie(HttpResponse<?> response, String name) {
        String header = setCookie(response, name);
        assertNotNull(header, name + " in " + response.headers().allValues("Set-Cookie"));
        return header.split(";")[0];
    }
}
