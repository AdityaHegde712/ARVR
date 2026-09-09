package com.arvr.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T4.2, T4.4). ErrorOverlay must render the given
 * error message. The stub renders "STUB", so every test fails until the
 * builder implements it.
 */
@RunWith(AndroidJUnit4::class)
class ErrorOverlayInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun should_display_the_error_message() {
        composeRule.setContent {
            ErrorOverlay(message = "Something went wrong")
        }

        composeRule.onNodeWithText("Something went wrong").assertIsDisplayed()
    }

    @Test
    fun should_display_the_ARCore_unavailable_message() {
        composeRule.setContent {
            ErrorOverlay(
                message = "ARCore is not available on this device. Please update from the Play Store.",
            )
        }

        composeRule
            .onNodeWithText("ARCore is not available on this device. Please update from the Play Store.")
            .assertIsDisplayed()
    }

    @Test
    fun should_display_the_model_load_error_message() {
        composeRule.setContent {
            ErrorOverlay(message = "Failed to load model")
        }

        composeRule.onNodeWithText("Failed to load model").assertIsDisplayed()
    }
}