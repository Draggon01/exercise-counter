package org.exercise.counter.exercisecounter.security;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Error responses over HTTP: correct status code and a JSON {@code {"error": ...}} body.
 * Uses the dev login ({@code user}/{@code password}).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class ErrorHandlingTest {

    @LocalServerPort
    int port;

    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;

    private HttpClient client;
    private Exercise foreignExercise;

    @BeforeEach
    void setup() throws Exception {
        client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        send(HttpRequest.newBuilder(uri("/api/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=user&password=password")));

        if (userRepository.findByUsername("err-owner").isEmpty()) {
            userRepository.save(new User("err-owner", "{noop}x"));
        }
        foreignExercise = new Exercise();
        foreignExercise.setExerciseTitle("Not yours");
        foreignExercise.setCreator("err-owner");
        foreignExercise.setDaysRepeat(1);
        foreignExercise.setStartTime(LocalTime.NOON);
        foreignExercise.setUtcOffset(0);
        foreignExercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        foreignExercise.setExerciseValue("1");
        foreignExercise.setVisibility(Visibility.PUBLIC);
        foreignExercise = exerciseRepository.save(foreignExercise);
    }

    @AfterEach
    void cleanup() {
        client.close();
        exerciseRepository.deleteById(foreignExercise.getExerciseId());
    }

    @Test
    void malformedUuid_is400() throws Exception {
        HttpResponse<String> res = send(HttpRequest.newBuilder(uri("/api/statistic/not-a-uuid")).GET());

        assertEquals(400, res.statusCode());
        assertTrue(res.body().contains("\"error\""), res.body());
    }

    @Test
    void deletingSomeoneElsesExercise_is403() throws Exception {
        HttpResponse<String> res = send(HttpRequest.newBuilder(uri("/api/exercises/" + foreignExercise.getExerciseId()))
                .DELETE());

        assertEquals(403, res.statusCode());
        assertTrue(res.body().contains("not the creator"), res.body());
        assertTrue(exerciseRepository.existsById(foreignExercise.getExerciseId()));
    }

    @Test
    void missingEntity_is404() throws Exception {
        HttpResponse<String> res = send(HttpRequest.newBuilder(uri("/api/statistic/" + UUID.randomUUID() + "/missed-entries"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"date\":\"2001-01-01\"}")));

        assertEquals(404, res.statusCode());
        assertTrue(res.body().contains("\"error\""), res.body());
    }

    @Test
    void unknownRoute_isNot500() throws Exception {
        HttpResponse<String> res = send(HttpRequest.newBuilder(uri("/api/does-not-exist")).GET());

        assertEquals(404, res.statusCode());
        assertTrue(res.body().contains("\"error\""), res.body());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
