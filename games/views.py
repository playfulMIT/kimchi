from django.shortcuts import render
from django.http import HttpResponse
from datacollection.models import URL
from django.shortcuts import get_object_or_404
# Create your views here.

def mitfp(request):
    # print(request.session.session_key)
    # request.session.save()
    # print(request.session.session_key)
    return render(request, 'games/mitftp.html', {'title':"shapes 0.3.0 playtest 3"})

    # return HttpResponse(request.session.session_key)

def shapes(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/shapes.html', {'title':"shapes 0.2.0 playtest 2",'sessionID':request.session.session_key})

def playtest(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/playtest.html', {'title':"shapes 0.3.0 playtest 3",'sessionID':request.session.session_key})


def gamews(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/gamews.html', {'title':"shapes 0.4.0 playtest 3",'sessionID':request.session.session_key})

def stg0910(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/stg0910.html', {'title': "shadow tangrams 0.1.0", 'sessionID': request.session.session_key})

def stg0924(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/stg24.html', {'title': "shadow tangrams 0.2.0", 'sessionID': request.session.session_key})

def wildcard_url(request, slug):
    if not request.session.session_key:
        request.session.save()
    print(slug)
    url = get_object_or_404(URL, pk=slug)
    print(url)
    request.session['url'] = url
    return render(request, 'games/test.html', {'title': "shadow tangrams 0.2.0", 'sessionID': request.session.session_key})