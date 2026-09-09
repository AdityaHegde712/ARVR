package com.arvr.app.ui

import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T3.6). CrosshairOverlay must render the crosshair
 * (tag "crosshair") only when placement mode is active. The stub renders
 * nothing, so the positive assertion fails until the builder implements it.
 */
@RunWith(AndroidJUnit4::class)
class CrosshairOverlayInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun should_show_the_crosshair_when_placement_mode_is_active() {
        composeRule.setContent {
            CrosshairOverlay(placementMode = true)
        }

        composeRule.onNodeWithTag("crosshair").assertIsDisplayed()
    }

    @Test
    fun should_hide_the_crosshair_when_placement_mode_is_inactive() {
        composeRule.setContent {
            CrosshairOverlay(placementMode = false)
        }

        composeRule.onNodeWithTag("crosshair").assertDoesNotExist()
    }
}