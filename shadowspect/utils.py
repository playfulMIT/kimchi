import json

from django.http import HttpResponse

from datacollection.models import URL, CustomSession
from shadowspect.models import Level


def get_config_json(request):
    print("success")
    url = URL.objects.get(pk=request.session['urlpk'])
    data = url.data
    return HttpResponse(data)


def get_level_json(request, slug):
    level = Level.objects.get(filename=slug)
    return HttpResponse(level.data)


def generate_session(request):
    if not request.session.session_key:
        request.session.save()
        # request.session.accessed = False
        # request.session.modified = False
        print('created session key')
    # print("session key: " + request.session.session_key)
    session = CustomSession.objects.get(session_key=request.session.session_key)

    if session.useragent is None:
        session.useragent = str(request.META.get('HTTP_USER_AGENT'))
    if session.ip is None:
        session.ip = str(request.META.get('REMOTE_ADDR'))
    session.save(update_fields=['useragent', 'ip'])
    session.accessed = False
    session.modified = False
    request.session.accessed = False
    request.session.modified = False
    return session
