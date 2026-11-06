from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'password', 'password_confirm']

    def validate_email(self, value):
        norm = value.strip().lower()
        if User.objects.filter(email=norm).exists():
            raise serializers.ValidationError('Este e-mail já está cadastrado.')
        return norm

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'As senhas não coincidem.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data.get('name', ''),
            password=validated_data['password'],
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        # Garante normalização de email para login
        if 'email' in attrs:
            attrs['email'] = attrs['email'].strip().lower()
            attrs['username'] = attrs['email']
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        data['tokens'] = {
            'access': data['access'],
            'refresh': data['refresh'],
        }
        return data
