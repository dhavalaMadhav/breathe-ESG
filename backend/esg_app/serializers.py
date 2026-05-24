from rest_framework import serializers
from .models import UploadBatch, RawRecord, NormalizedRecord

class UploadBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadBatch
        fields = '__all__'

class RawRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawRecord
        fields = '__all__'

class NormalizedRecordSerializer(serializers.ModelSerializer):
    raw_data = serializers.SerializerMethodField()

    class Meta:
        model = NormalizedRecord
        fields = [
            'id', 'batch', 'raw_record', 'source_type', 'activity_type', 
            'scope', 'normalized_quantity', 'normalized_unit', 'co2e_estimate', 
            'date', 'suspicious', 'suspicious_reason', 'status', 'approved_by', 
            'approved_at', 'locked', 'normalization_metadata', 'uploaded_at', 'raw_data'
        ]

    def get_raw_data(self, obj):
        if obj.raw_record:
            return obj.raw_record.raw_data
        return {}
