from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from catalog.views import ProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')


def health(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/', include(router.urls)),
]
