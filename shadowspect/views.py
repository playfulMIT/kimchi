from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL, CustomSession

from .utils import generate_session


def wildcard_url(request, slug):
    print('getting wildcard')
    session = generate_session(request)
    url = get_object_or_404(URL, pk=slug)
    request.session['urlpk'] = url.pk
    print('session id: ' + str(request.session.session_key))
    return render(request, 'shadowspect/play.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def mturk(request):
    session = generate_session(request)
    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': session.session_key})


def debug(request):
    session = generate_session(request)
    response = str(request.session.session_key) + "\n" + str(session.__dict__)
    return HttpResponse(response)
