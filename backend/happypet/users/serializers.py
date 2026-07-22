from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import ROLE_CHOICES

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "role",
            "code",
            "role_display",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "role_display"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    role = serializers.ChoiceField(choices=ROLE_CHOICES, default="cashier")
    code = serializers.CharField(max_length=6, required=False, allow_blank=True, default="")

    class Meta:
        model = User
        fields = ["id", "email", "name", "password", "role", "code", "is_active"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ["id", "email", "name", "password", "role", "code", "is_active"]
        read_only_fields = ["id", "email"]

    def update(self, instance, validated_data):
        if instance.code and "code" in validated_data:
            validated_data.pop("code")
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ("email", "name", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            name=validated_data.get("name", ""),
            password=validated_data["password"],
        )
        return user


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    role = serializers.CharField()
    user_id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()