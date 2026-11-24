package org.exercise.counter.exercisecounter.security;

import jakarta.servlet.ServletContext;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** The login must not end during a workout, also if the app is in the background for a while. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class SessionTest {

    @Autowired private ServletContext servletContext;

    @Test
    void endsAfterTwoIdleHours_withTheBrowserSession() {
        assertEquals(120, servletContext.getSessionTimeout());
        assertEquals(-1, servletContext.getSessionCookieConfig().getMaxAge(), "no login that outlives the browser");
    }
}
