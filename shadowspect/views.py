from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL, CustomSession

from .utils import generate_session


def wildcard_url(request, slug):
    print('getting wildcard')
    session = generate_session(request)
    url = get_object_or_404(URL, pk=slug)
    session.url = url
    session.save(update_fields=['url'])
    print('session id: ' + str(request.session.session_key))
    print("customsession dict: " + str(session.__dict__))
    # response = str(request.session.session_key) + "\n" + str(session.__dict__)
    # return HttpResponse(response)
    return render(request, 'shadowspect/play.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def mturk(request):
    if not request.session.session_key:
        request.session.save()
    session = generate_session(request)
    session.url = "mturk"
    session.save(update_fields=['url'])
    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def debug(request):
    session = generate_session(request)
    response = str(request.session.session_key) + "\n" + str(session.__dict__)
    return HttpResponse(response)
