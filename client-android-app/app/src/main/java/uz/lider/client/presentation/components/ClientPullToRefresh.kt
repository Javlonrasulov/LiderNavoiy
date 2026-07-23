package uz.lider.client.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import kotlinx.coroutines.launch
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

/**
 * Modern pull-to-refresh shell for scrollable screens.
 * [onRefresh] should reload data without blanking the whole page.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientPullToRefresh(
    onRefresh: suspend () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    var refreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val state = rememberPullToRefreshState()

    if (!enabled) {
        Box(modifier = modifier.fillMaxSize(), content = content)
        return
    }

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            if (refreshing) return@PullToRefreshBox
            scope.launch {
                refreshing = true
                try {
                    onRefresh()
                } finally {
                    refreshing = false
                }
            }
        },
        modifier = modifier.fillMaxSize(),
        state = state,
        indicator = {
            PullToRefreshDefaults.Indicator(
                state = state,
                isRefreshing = refreshing,
                modifier = Modifier.align(Alignment.TopCenter),
                color = LiquidGlass.Indigo,
                containerColor = LiquidTheme.bgMid,
            )
        },
        content = content,
    )
}
