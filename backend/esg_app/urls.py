from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_csv, name='upload_csv'),
    path('records/', views.list_records, name='list_records'),
    path('records/<int:pk>/approve/', views.approve_record, name='approve_record'),
    path('records/<int:pk>/reject/', views.reject_record, name='reject_record'),
    path('batches/', views.list_batches, name='list_batches'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
]
