package org.exercise.counter.exercisecounter.media;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.media.ExerciseMediaRepository;
import org.exercise.counter.exercisecounter.web.data.media.MediaStatus;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepRequest;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.exercise.counter.exercisecounter.web.service.AccountDeletionService;
import org.exercise.counter.exercisecounter.web.service.ExerciseDetailService;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.exercise.counter.exercisecounter.web.service.SelectionService;
import org.exercise.counter.exercisecounter.web.service.media.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Everything around the conversion, which is replaced by a fake. */
@SpringBootTest(properties = {"app.media.user-quota=5MB", "app.media.max-photo-upload=1KB"})
@Import(TestcontainersConfiguration.class)
class MediaServiceTest {

    private static final String ALICE = "media-alice"; // creator
    private static final String BOB = "media-bob";

    @TempDir
    static Path dir;

    @DynamicPropertySource
    static void mediaDir(DynamicPropertyRegistry registry) {
        registry.add("app.media.dir", () -> dir.toString());
    }

    @Autowired private MediaService mediaService;
    @Autowired private MediaCleanup cleanup;
    @Autowired private ExerciseDetailService detailService;
    @Autowired private ExerciseService exerciseService;
    @Autowired private AccountDeletionService deletionService;
    @Autowired private SelectionService selectionService;
    @Autowired private SchedulerService schedulerService;
    @Autowired private ExerciseMediaRepository mediaRepository;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TransactionTemplate transaction;
    @Autowired private WebApplicationContext context;
    @MockitoBean private MediaProcessor processor;

    private UUID publicId;
    private UUID privateId;
    private int videoBytes = 10;

    @BeforeEach
    void setup() throws Exception {
        for (String name : List.of(ALICE, BOB)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}password"));
            }
        }
        publicId = exercise(Visibility.PUBLIC);
        privateId = exercise(Visibility.PRIVATE);
        doAnswer(call -> result(call.getArgument(2))).when(processor).convert(any(), any(), any());
    }

    @AfterEach
    void removeAll() {
        for (UUID id : List.of(publicId, privateId)) {
            schedulerService.cancelSchedulerFor(id);
            if (exerciseRepository.existsById(id)) exerciseRepository.deleteById(id);
        }
    }

    @Test
    void upload_isConvertedAndShownWithTheStep() throws Exception {
        UUID step = step(publicId);
        assertEquals(MediaStatus.PROCESSING, upload(publicId, step).status());
        MediaDto media = await(publicId, step, MediaStatus.READY);

        assertEquals(List.of(640, 360, 3000), List.of(media.width(), media.height(), media.durationMs()));
        assertTrue(media.hasAudio());
        assertEquals(2, filesOf(media.mediaId()));
        assertEquals(13, mediaService.usage(ALICE).usedBytes());
        assertEquals(0, mediaService.usage(BOB).usedBytes());
        awaitTrue(() -> workFolders() == 0, "the upload is deleted");
        assertEquals(media, detailService.updateStep(publicId, step, request("new"), ALICE).media(), "editing keeps it");
    }

    @Test
    void onlyTheCreatorUploads_whoSeesTheExerciseSeesTheFile() throws Exception {
        UUID step = step(publicId);
        UUID privateStep = step(privateId);
        assertThrows(ForbiddenException.class, () -> mediaService.upload(publicId, step, video(), BOB));
        assertThrows(ForbiddenException.class, () -> mediaService.delete(publicId, step, BOB));
        assertThrows(NotFoundException.class, () -> mediaService.upload(privateId, privateStep, video(), BOB));
        assertThrows(NotFoundException.class, () -> mediaService.upload(publicId, privateStep, video(), ALICE), "step of another exercise");

        upload(privateId, privateStep);
        UUID hidden = await(privateId, privateStep, MediaStatus.READY).mediaId();
        upload(publicId, step);
        UUID shown = await(publicId, step, MediaStatus.READY).mediaId();
        assertTrue(mediaService.open(hidden, MediaFile.VIDEO, ALICE).exists());
        assertThrows(NotFoundException.class, () -> mediaService.open(hidden, MediaFile.VIDEO, BOB));
        assertTrue(mediaService.open(shown, MediaFile.IMAGE, BOB).exists());
        assertThrows(NotFoundException.class, () -> mediaService.open(UUID.randomUUID(), MediaFile.IMAGE, ALICE));
    }

    @Test
    void http_rangesCachingAndLogin() throws Exception {
        MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        UUID step = step(publicId);
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT, "/api/exercises/{e}/steps/{s}/media", publicId, step)
                .file(video()).with(user(ALICE))).andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("PROCESSING"));
        UUID id = await(publicId, step, MediaStatus.READY).mediaId();

        mvc.perform(get("/api/media/{id}", id).with(user(BOB))).andExpect(status().isOk())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, private, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        mvc.perform(get("/api/media/{id}", id).header("Range", "bytes=0-3").with(user(BOB))).andExpect(status().isPartialContent())
                .andExpect(header().string("Content-Range", "bytes 0-3/10"));
        mvc.perform(get("/api/media/{id}/poster", id).with(user(BOB))).andExpect(content().contentType("image/jpeg"));
        mvc.perform(get("/api/media/{id}", id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/media/config").with(user(BOB))).andExpect(jsonPath("$.enabled").value(true)).andExpect(jsonPath("$.maxSeconds").value(15));
        mvc.perform(get("/api/media/usage").with(user(ALICE))).andExpect(jsonPath("$.usedBytes").value(13));
    }

    @Test
    void unusableFilesAreRefused() {
        UUID step = step(publicId);
        assertStatus(400, () -> mediaService.upload(publicId, step, file("<html>not a video</html>"), ALICE));
        assertStatus(400, () -> mediaService.upload(publicId, step, file(""), ALICE));
        assertStatus(400, () -> mediaService.upload(publicId, step, file("\0\0\0\u0018ftypheic"), ALICE));
        assertStatus(413, () -> mediaService.upload(publicId, step, file("\u0089PNG" + "x".repeat(2000)), ALICE));
        assertEquals(0, workFolders());
    }

    @Test
    void failedConversion_saysWhy_andCanBeReplaced() throws Exception {
        doThrow(new MediaException("Videos can be up to 15 seconds long")).when(processor).convert(any(), any(), any());
        UUID step = step(publicId);
        upload(publicId, step);
        assertEquals("Videos can be up to 15 seconds long", await(publicId, step, MediaStatus.FAILED).error());

        doAnswer(call -> result(call.getArgument(2))).when(processor).convert(any(), any(), any());
        upload(publicId, step);
        assertNull(await(publicId, step, MediaStatus.READY).error());
    }

    @Test
    void quota_countsUploadsInProgress_andReplacingIsPossible() throws Exception {
        videoBytes = 2 * 1024 * 1024 - 3;
        UUID a = step(publicId);
        UUID b = step(publicId);
        UUID c = step(publicId);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(call -> {
            release.await();
            return result(call.getArgument(2));
        }).when(processor).convert(any(), any(), any());
        upload(publicId, a);
        upload(publicId, b);
        try {
            assertStatus(413, () -> upload(publicId, c)); // 2 + 2 reserved, 2 more do not fit into 5
        } finally {
            release.countDown();
        }
        await(publicId, a, MediaStatus.READY);
        await(publicId, b, MediaStatus.READY);
        assertStatus(413, () -> upload(publicId, c));
        UUID before = media(publicId, a).mediaId();
        upload(publicId, a);
        MediaDto replaced = await(publicId, a, MediaStatus.READY);
        assertNotEquals(before, replaced.mediaId());
        assertEquals(0, filesOf(before), "old files are gone");
        mediaService.delete(publicId, b, ALICE);
        upload(publicId, c);
        await(publicId, c, MediaStatus.READY);
    }

    @Test
    void deletingWhileConverting_leavesNothing() throws Exception {
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(call -> {
            started.countDown();
            release.await();
            return result(call.getArgument(2));
        }).when(processor).convert(any(), any(), any());
        UUID step = step(publicId);
        UUID id = upload(publicId, step).mediaId();
        started.await();
        mediaService.delete(publicId, step, ALICE);
        release.countDown();
        awaitTrue(() -> workFolders() == 0, "conversion finished");
        assertEquals(0, filesOf(id));
        assertNull(media(publicId, step));
    }

    @Test
    void deletingStepOrExercise_deletesTheFiles_butNotOnRollback() throws Exception {
        UUID a = step(publicId);
        UUID b = step(publicId);
        upload(publicId, a);
        upload(publicId, b);
        UUID mediaA = await(publicId, a, MediaStatus.READY).mediaId();
        UUID mediaB = await(publicId, b, MediaStatus.READY).mediaId();

        transaction.executeWithoutResult(status -> {
            detailService.deleteStep(publicId, a, ALICE);
            status.setRollbackOnly();
        });
        assertEquals(2, filesOf(mediaA));
        detailService.deleteStep(publicId, a, ALICE);
        assertEquals(0, filesOf(mediaA));
        assertEquals(2, filesOf(mediaB));
        exerciseService.delete(publicId, ALICE);
        assertEquals(0, filesOf(mediaB));
        assertFalse(mediaRepository.existsById(mediaB));
    }

    @Test
    void deletedAccount_filesGoOrAreHandedOver() throws Exception {
        selectionService.select(publicId, BOB);
        UUID shared = step(publicId);
        UUID own = step(privateId);
        upload(publicId, shared);
        upload(privateId, own);
        UUID sharedMedia = await(publicId, shared, MediaStatus.READY).mediaId();
        UUID ownMedia = await(privateId, own, MediaStatus.READY).mediaId();

        deletionService.deleteAccount(ALICE, "password");

        assertEquals(0, filesOf(ownMedia));
        assertEquals(2, filesOf(sharedMedia));
        assertEquals(13, mediaService.usage(BOB).usedBytes(), "counts for the new creator");
        assertTrue(mediaService.open(sharedMedia, MediaFile.VIDEO, BOB).exists());
    }

    @Test
    void cleanup_deletesOnlyOldFilesWithoutEntry() throws Exception {
        UUID step = step(publicId);
        upload(publicId, step);
        UUID used = await(publicId, step, MediaStatus.READY).mediaId();
        Path foreign = Files.writeString(dir.resolve("readme.mp4"), "x");
        Files.setLastModifiedTime(dir.resolve(used + ".mp4"), FileTime.from(Instant.now().minus(Duration.ofDays(9))));

        cleanup.clean(Instant.now().plus(Duration.ofHours(25))); // left over from other tests
        Path orphanFile = Files.writeString(dir.resolve(UUID.randomUUID() + ".mp4"), "x");
        assertEquals(0, cleanup.clean(Instant.now()), "a new file may still get its entry");
        assertEquals(1, cleanup.clean(Instant.now().plus(Duration.ofHours(25))));
        assertFalse(Files.exists(orphanFile));
        assertTrue(Files.exists(foreign));
        assertEquals(2, filesOf(used));
    }

    private MediaProcessor.Result result(Path folder) throws Exception {
        Path video = Files.write(folder.resolve("v"), new byte[videoBytes]);
        Path image = Files.write(folder.resolve("i"), new byte[3]);
        return new MediaProcessor.Result(video, image, 3000, 640, 360, true);
    }

    private MediaDto upload(UUID exerciseId, UUID step) {
        return mediaService.upload(exerciseId, step, video(), ALICE);
    }

    private static MockMultipartFile video() {
        return file("\0\0\0\u0018ftypisom....");
    }

    private static MockMultipartFile file(String content) {
        return new MockMultipartFile("file", "../../evil.sh", "text/html", content.getBytes(StandardCharsets.ISO_8859_1));
    }

    private MediaDto media(UUID exerciseId, UUID step) {
        return detailService.load(exerciseId, ALICE).steps().stream().filter(s -> s.stepId().equals(step)).findFirst().orElseThrow().media();
    }

    private MediaDto await(UUID exerciseId, UUID step, MediaStatus status) throws Exception {
        awaitTrue(() -> media(exerciseId, step).status() == status, "status " + status);
        return media(exerciseId, step);
    }

    private interface Check {
        boolean holds() throws Exception;
    }

    private static void awaitTrue(Check check, String what) throws Exception {
        for (int i = 0; i < 200 && !check.holds(); i++) {
            Thread.sleep(25);
        }
        assertTrue(check.holds(), what);
    }

    private static long filesOf(UUID mediaId) throws Exception {
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(f -> f.getFileName().toString().startsWith(mediaId.toString())).count();
        }
    }

    private static long workFolders() {
        try (Stream<Path> files = Files.list(dir.resolve("work"))) {
            return files.count();
        } catch (java.io.IOException e) {
            return 0;
        }
    }

    private static void assertStatus(int status, org.junit.jupiter.api.function.Executable call) {
        assertEquals(status, assertThrows(ResponseStatusException.class, call).getStatusCode().value());
    }

    private UUID step(UUID exerciseId) {
        return detailService.addStep(exerciseId, request("step"), ALICE).stepId();
    }

    private static ExerciseStepRequest request(String title) {
        return new ExerciseStepRequest(title, null, null, null, null, null);
    }

    private UUID exercise(Visibility visibility) {
        Exercise e = new Exercise();
        e.setExerciseTitle("Knee");
        e.setCreator(ALICE);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.NOON);
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.TIMEREPEAT);
        e.setExerciseValue("1200");
        e.setVisibility(visibility);
        return exerciseRepository.save(e).getExerciseId();
    }
}
