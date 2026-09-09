package com.arvr.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T1.2, T4.1). MainActivity must launch and render
 * the AR scaffold root (tag "main_activity_root") once camera permission is
 * granted. The stub renders "stub_root", so the tag assertion fails until the
 * builder implements the real scaffold.
 */
@RunWith(AndroidJUnit4::class)
class MainActivityInstrumentedTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun grantCameraPermission() {
        InstrumentationRegistry.getInstrumentation()
            .uiAutomation
            .grantRuntimePermission("com.arvr.app", "android.permission.CAMERA")
    }

    @Test
    fun should_launch_MainActivity_without_crashing() {
        assertNotNull(composeRule.activity)
    }

    @Test
    fun should_show_the_ar_scaffold_when_camera_permission_is_granted() {
        composeRule.onNodeWithTag("main_activity_root").assertIsDisplayed()
    }
}