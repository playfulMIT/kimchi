import socket

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for
    else:
        return request.META.get('REMOTE_ADDR')
#
# def get_session_id(request):
#     if not request.session.get('has_session'):
#         request.session['has_session'] = True
#     return request.session.session_key