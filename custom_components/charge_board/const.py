DOMAIN = "charge_board"
DEFAULT_GAP_HOURS = 3
DEFAULT_POWER_THRESHOLD_W = 100
MIN_SESSION_KWH = 0.01
TICK_SECONDS = 30
# Energy counter increase above this power since its last reading is a glitch.
MAX_CHARGER_W = 25_000
# Power curve: a point per window of at least CURVE_STEP_S. A window can overrun by one
# interval (<= 2 ticks, longer ones are restart gaps), so a point never covers more than
# CURVE_WINDOW_MAX_S: past that (e.g. the gap between two merged sessions) the power is 0.
# The panel mirrors it in frontend/src/chart.ts.
CURVE_STEP_S = 300
CURVE_WINDOW_MAX_S = CURVE_STEP_S + 2 * TICK_SECONDS
DEFAULT_TARGET = 100
# A charge is announced as started after this much continuous charging (not a plug-in burst).
STARTED_MIN_S = 300
OVERVIEW_STYLES = ["detailed", "compact"]
SUBENTRY_CHARGER = "charger"
SUBENTRY_VEHICLE = "vehicle"
# Finished sessions were added or replaced (store changed).
SIGNAL_UPDATED = f"{DOMAIN}_updated"
# Live data of one charger changed (after every sample); format with the charger id.
SIGNAL_LIVE = f"{DOMAIN}_live_{{}}"
NOTIFICATIONS = ["plugged", "started", "unplugged"]
EVENT_PREFIX = f"{DOMAIN}_"
