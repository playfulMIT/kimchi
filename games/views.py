from django.shortcuts import render

# Create your views here.

def toygame(request):
    return render(request, 'games/toygame.html')