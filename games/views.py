from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.

def mitfp(request):
    print(request.session.session_key)
    request.session.save()
    # print(request.session.session_key)
    return render(request, 'games/mitftp.html', {'title':"shapes 0.2.0 playtest 2",'sessionID':request.session.session_key})

    # return HttpResponse(request.session.session_key)

def shapes(request):
    request.session.save()
    return render(request, 'games/shapes.html', {'title':"shapes 0.2.0 playtest 2",'sessionID':request.session.session_key})