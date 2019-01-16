from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL


def wildcard_url(request, slug):
    print('getting wildcard')
    if not request.session.session_key:
        request.session.save()
    url = get_object_or_404(URL, pk=slug)
    request.session['urlpk'] = url.pk
    return render(request, 'games/test.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})
