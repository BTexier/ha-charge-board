DOMAIN = "charge_board"
DEFAULT_GAP_HOURS = 3
DEFAULT_POWER_THRESHOLD_W = 100
MIN_SESSION_KWH = 0.01
TICK_SECONDS = 30
DEFAULT_TARGET = 100
OVERVIEW_STYLES = ["detailed", "compact"]
SUBENTRY_CHARGER = "charger"
SUBENTRY_VEHICLE = "vehicle"
# Finished sessions were added or replaced (store changed).
SIGNAL_UPDATED = f"{DOMAIN}_updated"
# Live data of one charger changed (after every sample); format with the charger id.
SIGNAL_LIVE = f"{DOMAIN}_live_{{}}"
