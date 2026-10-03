from django.urls import path
from . import views

urlpatterns = [
    path("assignments/<int:pk>/templates/", views.templates),
    path("templates/<int:pk>/", views.delete_template),
    path("assignments/<int:pk>/similarity-runs/", views.runs),
    path("similarity-runs/<int:pk>/", views.run_detail),
    path("similarity-pairs/<int:pk>/", views.pair_detail),
    path("similarity-pairs/<int:pk>/review/", views.review_pair),
]
