from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlockViewSet, upload_image

router = DefaultRouter()
router.register(r'blocks', BlockViewSet, basename='blocks')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/upload/image/', upload_image, name='upload_image'),
]