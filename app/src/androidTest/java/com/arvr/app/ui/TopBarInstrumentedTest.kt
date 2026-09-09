package com.arvr.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.arvr.app.ar.DepthMode
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T4.6). TopBar must display the placed model count,
 * the depth mode indicator, and a reset button that calls onReset. The stub
 * renders "STUB", so every test fails until the builder implements it.
 */
@RunWith(AndroidJUnit4::class)
class TopBarInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun should_display_the_placed_model_count() {
        composeRule.setContent {
            TopBar(modelCount = 3, depthMode = DepthMode.API, onReset = {})
        }

        composeRule.onNodeWithText("3").assertIsDisplayed()
    }

    @Test
    fun should_display_the_current_depth_mode_indicator() {
        composeRule.setContent {
            TopBar(modelCount = 0, depthMode = DepthMode.ML, onReset = {})
        }

        composeRule.onNodeWithText("ML").assertIsDisplayed()
    }

    @Test
    fun should_call_onReset_when_the_reset_button_is_clicked() {
        var reset = false

        composeRule.setContent {
            TopBar(modelCount = 1, depthMode = DepthMode.API, onReset = { reset = true })
        }

        composeRule.onNodeWithTag("reset_button").performClick()

        assertTrue(reset)
    }
}