from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL, CustomSession


def wildcard_url(request, slug):
    print('getting wildcard')
    if not request.session.session_key:
        request.session.save()
    url = get_object_or_404(URL, pk=slug)
    request.session['urlpk'] = url.pk
    return render(request, 'shadowspect/play.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def mturk(request):
    if not request.session.session_key:
        request.session.save()
    print("session key: " + request.session.session_key)
    print("session dict: " + str(request.session.model.__dict__))
    session = CustomSession.objects.defer(None).get(session_key=request.session.session_key)
    if session.useragent is None:
        print("assigning useragent: " + str(request.META.get('HTTP_USER_AGENT')))
        session.useragent = str(request.META.get('HTTP_USER_AGENT'))
    if session.ip is None:
        # print("assigning ip: " + str(request.META.get('REMOTE_ADDR')))
        address = str(request.META.get('REMOTE_ADDR'))
        request.session['ip'] = address
    # request.session.modified = True
    session.save()
    # request.session.save()

    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def debug(request):
    if not request.session.session_key:
        request.session.save()
    print("session key: " + request.session.session_key)

    session = CustomSession.objects.get(session_key=request.session.session_key)
    print("session dict: " + str(session.__dict__))
    print("request dict:" + str(request.session.__dict__))
    if session.useragent is None:
        print("assigning useragent: " + str(request.META.get('HTTP_USER_AGENT')))
        session.useragent = str(request.META.get('HTTP_USER_AGENT'))
        # session.save()
    if session.ip is None:
        session.ip = str(request.META.get('REMOTE_ADDR'))
    print("state: " + str(request.session['_state'].__dict__))
    session.save()
    response = str(request.session.session_key) + "\n" + str(session.__dict__)
    return HttpResponse(response)
