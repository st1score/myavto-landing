from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'master_sku', 'title', 'category_code', 'brand_code',
            'oem_numbers', 'cross_numbers', 'compatible_engines', 'status',
            'seo_title', 'seo_desc', 'seo_keywords', 'created_at', 'updated_at',
        ]
