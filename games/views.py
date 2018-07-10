from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.

def test(request):
    print(request.session.session_key)
    request.session.save()
    print(request.session.session_key)
    return render(request, 'games/toygame.html')

    # return HttpResponse(request.session.session_key)

def shapes(request):
    request.session.save()
    return render(request, 'games/shapes.html')