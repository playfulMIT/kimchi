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
    session = CustomSession.objects.get(session_key=request.session.session_key)
    if request.session.model.useragent is None:
        print("assigning useragent: " + str(request.META.get('HTTP_USER_AGENT')))
        request.session.model.useragent = str(request.META.get('HTTP_USER_AGENT'))
    if request.session.model.ip is None:
        # print("assigning ip: " + str(request.META.get('REMOTE_ADDR')))
        address = str(request.META.get('REMOTE_ADDR'))
        request.session.model.ip = address
    request.session.modified = True
    session.save()
    request.session.save()
    request.session.model.save()
    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})
