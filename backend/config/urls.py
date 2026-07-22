"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenRefreshView
from happypet.users.views import LoginView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("config.api_router")),
    path("api/auth/login", LoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# Catch-all for SPA — must be LAST.
# Exclude API, admin, and static paths so Django never tries to render index.html for them.
urlpatterns += [
    re_path(
        r'^(?!(?:api|admin|static)/).*',
        TemplateView.as_view(template_name='index.html'),
        name='spa-catch-all',
    ),
]
