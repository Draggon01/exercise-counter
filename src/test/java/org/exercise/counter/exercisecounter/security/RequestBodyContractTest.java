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
        groupRepository.deleteAll(groupRepository.findByGroupName(GROUP + " two"));
        registerRepository.deleteAll(registerRepository.findByIssuer(USER));
    }

    @Test
    void exercises_create_update_delete() throws Exception {
        String body = "{\"exerciseTitle\":\"Created\",\"daysRepeat\":1,\"startTime\":\"12:00:00\",\"utcOffset\":0,"
                + "\"exerciseType\":\"NUMBERREPEAT\",\"exerciseValue\":\"5\",\"visibility\":\"PRIVATE\",\"groups\":[]}"; // like the frontend: no position
        HttpResponse<String> created = json("POST", "/api/exercises", body);
        assertEquals(201, created.statusCode(), created.body());
        String id = created.body().replaceAll(".*\"exerciseId\":\"([^\"]+)\".*", "$1");

        HttpResponse<String> updated = json("PUT", "/api/exercises/" + id, body.replace("Created", "Updated"));
        assertEquals(200, updated.statusCode());
        assertTrue(updated.body().contains("Updated"));

        assertEquals(204, json("DELETE", "/api/exercises/" + id, null).statusCode());
        assertFalse(json("GET", "/api/exercises", null).body().contains(id));
    }

    @Test
    void exerciseMeta() throws Exception {
        assertTrue(json("GET", "/api/exercises/types", null).body().contains("NUMBERREPEAT"));
        assertTrue(json("GET", "/api/exercises/visibilities", null).body().contains("GROUPS"));
    }

    @Test
    void selection_select_reorder_unselect() throws Exception {
        String id = exercise.getExerciseId().toString();

        assertEquals(204, json("PUT", "/api/selection/" + id, null).statusCode());
        assertTrue(json("GET", "/api/exercises/selected", null).body().contains(id));

        HttpResponse<String> reorder = json("PUT", "/api/selection/order", "[\"" + id + "\"]");
        assertEquals(200, reorder.statusCode());
        assertTrue(reorder.body().contains(id));

        assertEquals(204, json("DELETE", "/api/selection/" + id, null).statusCode());
        assertFalse(json("GET", "/api/exercises/selected", null).body().contains(id));
    }

    @Test
    void checks_checkAndUncheck() throws Exception {
        String id = exercise.getExerciseId().toString();

        HttpResponse<String> checked = json("PUT", "/api/checks/" + id, null);
        assertEquals(200, checked.statusCode());
        assertTrue(checked.body().contains(id));
        assertTrue(json("GET", "/api/checks", null).body().contains(id));

        assertEquals(204, json("DELETE", "/api/checks/" + id, null).statusCode());
        assertEquals("[]", json("GET", "/api/checks", null).body());
    }

    @Test
    void log_saveAndLoad() throws Exception {
        String id = exercise.getExerciseId().toString();
        assertEquals("{\"value\":null}", json("GET", "/api/log/" + id, null).body());

        assertEquals(204, json("PUT", "/api/log/" + id, "{\"value\":42}").statusCode());

        assertEquals("{\"value\":42}", json("GET", "/api/log/" + id, null).body());
    }

    @Test
    void groups_create_invite_join_accept_leave() throws Exception {
        assertEquals(201, json("POST", "/api/groups",
                "{\"groupName\":\"" + GROUP + "\",\"visibility\":\"PUBLIC\"}").statusCode());
        assertTrue(json("GET", "/api/groups/public?query=contract", null).body().contains(GROUP));
        assertTrue(json("GET", "/api/groups/mine", null).body().contains(GROUP));

        HttpResponse<String> invite = json("POST", "/api/groups/" + GROUP + "/invitations",
                "{\"username\":\"does-not-exist\"}");
        assertEquals("false", invite.body());

        assertEquals(200, json("POST", "/api/groups/" + GROUP + "/join", null).statusCode());
        assertEquals(200, json("POST", "/api/groups/" + GROUP + "/accept", null).statusCode());
        assertEquals(200, json("DELETE", "/api/groups/" + GROUP + "/membership", null).statusCode());
        assertTrue(groupRepository.findByGroupName(GROUP).isEmpty());
    }

    @Test
    void groups_nameWithSpace_isUrlEncoded() throws Exception {
        String name = GROUP + " two";
        assertEquals(201, json("POST", "/api/groups", "{\"groupName\":\"" + name + "\"}").statusCode());

        assertEquals(200, json("DELETE", "/api/groups/" + GROUP + "%20two/membership", null).statusCode());
        assertTrue(groupRepository.findByGroupName(name).isEmpty());
    }

    @Test
    void groups_nameWithSlash_isRejected() throws Exception {
        assertEquals(400, json("POST", "/api/groups", "{\"groupName\":\"a/b\"}").statusCode());
    }

    @Test
    void statistic_load_unfinished_missedEntry() throws Exception {
        String id = exercise.getExerciseId().toString();
        assertTrue(json("GET", "/api/statistic/" + id, null).body().contains("current"));
        assertEquals("[]", json("GET", "/api/statistic/" + id + "/unfinished-periods", null).body());
        assertEquals(404, json("POST", "/api/statistic/" + id + "/missed-entries",
                "{\"periodId\":\"" + UUID.randomUUID() + "\"}").statusCode());
    }

    @Test
    void user_publicChecks_andInviteLink() throws Exception {
        assertTrue(json("GET", "/api/public/userinfo", null).body().contains(USER));
        assertEquals("true", json("GET", "/api/public/username-available?username=free-name-123", null).body());
        assertEquals("false", json("GET", "/api/public/username-available?username=" + USER, null).body());
        assertEquals("false", json("GET", "/api/public/invites/" + UUID.randomUUID() + "/valid", null).body());

        HttpResponse<String> link = json("POST", "/api/invites", "{\"baseUrl\":\"http://localhost:5173\"}");
        assertEquals(200, link.statusCode());
        assertTrue(link.body().startsWith("http://localhost:5173/register/"), link.body());

        String registerId = link.body().substring(link.body().lastIndexOf('/') + 1);
        assertEquals("true", json("GET", "/api/public/invites/" + registerId + "/valid", null).body());
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
