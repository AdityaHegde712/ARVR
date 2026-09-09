package com.arvr.app.ar

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T1.3, T4.2). ARScreen must render an error message
 * when the AR session is unavailable. The stub renders "STUB", so the
 * assertion fails until the builder implements the real state rendering.
 */
@RunWith(AndroidJUnit4::class)
class ARScreenInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun should_show_an_error_message_when_the_ar_session_is_unavailable() {
        composeRule.setContent {
            ARScreen(arSession = null)
        }

        composeRule.onNodeWithText("AR session unavailable").assertIsDisplayed()
    }
}