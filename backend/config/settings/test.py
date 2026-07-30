from .base import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "happypet.users",
    "happypet.cash",
    "happypet.sales",
    "happypet.products",
    "happypet.services",
]

ROOT_URLCONF = "config.urls_test"
