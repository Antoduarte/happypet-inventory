from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import RegisterView, UserViewSet, LoginView

router = SimpleRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/register", RegisterView.as_view({'post': 'create'}), name="register"),
    path("auth/login", LoginView.as_view(), name="login"),
] + router.urls