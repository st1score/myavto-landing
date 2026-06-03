from rest_framework import viewsets

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only catalog API. Tracer-bullet: lists active products.

    Read-only for now — writes still go through the existing admin until the
    Django write path is built out. Lookup by master_sku (slug comes later).
    """
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(status='active').order_by('-updated_at')
    lookup_field = 'master_sku'
