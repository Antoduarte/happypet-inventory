from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    LoginResponseSerializer,
)
from .permissions import IsAdmin, IsManagerOrAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterView(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Usuario creado exitosamente", "user_id": user.id},
            status=status.HTTP_201_CREATED,
        )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"error": "No puedes eliminarte a ti mismo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[IsManagerOrAdmin])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="verify-code")
    def verify_code(self, request):
        code = request.data.get("code", "")
        if not code:
            return Response({"valid": False}, status=status.HTTP_200_OK)

        user = User.objects.filter(
            code=code,
            role__in=["admin", "manager"],
            is_active=True,
        ).first()

        if user:
            return Response({
                "valid": True,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "role": user.role,
                }
            })
        return Response({"valid": False}, status=status.HTTP_200_OK)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(email=request.data.get("email"))
            response.data.update(
                {
                    "role": user.role,
                    "user_id": user.id,
                    "name": user.name,
                    "email": user.email,
                }
            )
        return response
