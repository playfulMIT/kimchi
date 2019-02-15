from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL


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
    print('metadata:')
    request.session.useragent = request.META.get('HTTP_USER_AGENT')
    request.session.ip = request.META.get('REMOTE_ADDR')
    request.session.save()
    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})
