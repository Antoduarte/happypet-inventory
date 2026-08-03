from django.utils import timezone
from datetime import timedelta


def get_today_range():
    """Return the start and end datetime for the current local day.

    Uses TIME_ZONE-aware localtime so that the day boundary matches the
    configured region (e.g. America/Managua) rather than UTC.
    """
    local_now = timezone.localtime()
    start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end
