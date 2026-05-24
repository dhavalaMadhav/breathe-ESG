from django.db import models

class UploadBatch(models.Model):
    SOURCE_CHOICES = [
        ('SAP', 'SAP'),
        ('Utility', 'Utility'),
        ('Travel', 'Travel'),
    ]
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    file_name = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    flagged_rows = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_type} Batch #{self.id} ({self.file_name})"

class RawRecord(models.Model):
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='raw_records')
    raw_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RawRecord #{self.id} for Batch #{self.batch.id}"

class NormalizedRecord(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    SCOPE_CHOICES = [
        ('Scope 1', 'Scope 1'),
        ('Scope 2', 'Scope 2'),
        ('Scope 3', 'Scope 3'),
    ]
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='normalized_records')
    raw_record = models.OneToOneField(RawRecord, on_delete=models.CASCADE, null=True, blank=True, related_name='normalized_record')
    source_type = models.CharField(max_length=20, choices=UploadBatch.SOURCE_CHOICES)
    activity_type = models.CharField(max_length=100)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    normalized_quantity = models.FloatField()
    normalized_unit = models.CharField(max_length=20)
    co2e_estimate = models.FloatField()
    date = models.DateField(null=True, blank=True)
    
    # Suspicious Anomaly Flags
    suspicious = models.BooleanField(default=False)
    suspicious_reason = models.TextField(null=True, blank=True)
    
    # Workflow State
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    approved_by = models.CharField(max_length=100, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked = models.BooleanField(default=False)
    
    # Audit Traceability Metadata
    normalization_metadata = models.JSONField(null=True, blank=True)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Normalized ESG {self.scope} Record #{self.id} ({self.activity_type})"
