package org.exercise.counter.exercisecounter.security;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.groups.GroupRepository;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Sends the exact JSON bodies the frontend sends, so changes to request DTOs that break
 * the frontend contract fail here (controller unit tests bypass JSON deserialization).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RequestBodyContractTest {

    private static final String USER = "contract-user";
    private static final String GROUP = "contract-group";

    @LocalServerPort
    int port;

    @Autowired private UserRepository userRepository;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private RegisterRepository registerRepository;

    private HttpClient client;
    private Exercise exercise;

    @BeforeEach
    void setup() throws Exception {
        if (userRepository.findByUsername(USER).isEmpty()) {
            userRepository.save(new User(USER, "{noop}pw"));
        }
        exercise = new Exercise();
        exercise.setExerciseTitle("Contract");
        exercise.setCreator(USER);
        exercise.setDaysRepeat(1);
        exercise.setStartTime(LocalTime.NOON);
        exercise.setUtcOffset(0);
        exercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        exercise.setExerciseValue("1");
        exercise.setVisibility(Visibility.PRIVATE);
        exercise = exerciseRepository.save(exercise);

        client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> login = send("POST", "/api/login", "application/x-www-form-urlencoded",
                "username=" + USER + "&password=pw");
        assertEquals(200, login.statusCode());
    }

    @AfterEach
    void cleanup() {
        client.close();
        exerciseRepository.delete(exercise);
        groupRepository.deleteAll(groupRepository.findByGroupName(GROUP));
        registerRepository.deleteAll(registerRepository.findByIssuer(USER));
    }

    @Test
    void selection_select_reorder_unselect() throws Exception {
        String id = exercise.getExerciseId().toString();

        assertEquals(200, json("POST", "/api/selection/select", "{\"exerciseId\":\"" + id + "\"}").statusCode());
        assertTrue(json("GET", "/api/exercises/list/selected", null).body().contains(id));

        HttpResponse<String> reorder = json("POST", "/api/selection/reorder", "[\"" + id + "\"]");
        assertEquals(200, reorder.statusCode());
        assertTrue(reorder.body().contains(id));

        assertEquals(200, json("POST", "/api/selection/unselect", "{\"exerciseId\":\"" + id + "\"}").statusCode());
        assertFalse(json("GET", "/api/exercises/list/selected", null).body().contains(id));
    }

    @Test
    void log_saveAndLoad() throws Exception {
        String id = exercise.getExerciseId().toString();
        assertEquals("{\"value\":null}", json("GET", "/api/log/" + id, null).body());

        assertEquals(200, json("POST", "/api/log/save", "{\"exerciseId\":\"" + id + "\",\"value\":42}").statusCode());

        assertEquals("{\"value\":42}", json("GET", "/api/log/" + id, null).body());
    }

    @Test
    void groups_create_invite_leave() throws Exception {
        assertEquals(200, json("POST", "/api/groups/user/create",
                "{\"groupName\":\"" + GROUP + "\",\"visibility\":\"PUBLIC\"}").statusCode());

        HttpResponse<String> invite = json("POST", "/api/groups/user/invite",
                "{\"username\":\"does-not-exist\",\"groupName\":\"" + GROUP + "\"}");
        assertEquals("false", invite.body());

        assertEquals(200, json("POST", "/api/groups/user/join", "{\"groupName\":\"" + GROUP + "\"}").statusCode());
        assertEquals(200, json("POST", "/api/groups/user/accept", "{\"groupName\":\"" + GROUP + "\"}").statusCode());
        assertEquals(200, json("POST", "/api/groups/user/delete", "{\"groupName\":\"" + GROUP + "\"}").statusCode());
        assertTrue(groupRepository.findByGroupName(GROUP).isEmpty());
    }

    @Test
    void user_publicChecks_andInviteLink() throws Exception {
        assertEquals("true", json("POST", "/api/public/checkUser", "{\"username\":\"free-name-123\"}").body());
        assertEquals("false", json("POST", "/api/public/checkUser", "{\"username\":\"" + USER + "\"}").body());
        assertEquals("false", json("POST", "/api/public/isInviteLinkValid",
                "{\"registerId\":\"" + UUID.randomUUID() + "\"}").body());

        HttpResponse<String> link = json("POST", "/api/user/getInviteLink", "{\"baseUrl\":\"http://localhost:5173\"}");
        assertEquals(200, link.statusCode());
        assertTrue(link.body().startsWith("http://localhost:5173/register/"), link.body());

        String registerId = link.body().substring(link.body().lastIndexOf('/') + 1);
        assertEquals("true", json("POST", "/api/public/isInviteLinkValid",
                "{\"registerId\":\"" + registerId + "\"}").body());
    }

    private HttpResponse<String> json(String method, String path, String body) throws Exception {
        return send(method, path, "application/json", body);
    }

    private HttpResponse<String> send(String method, String path, String contentType, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", contentType)
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
