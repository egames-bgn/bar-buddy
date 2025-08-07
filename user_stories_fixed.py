import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from cheerios.players.constants import STORED_PROCEDURE_MAPPER
from cheerios.db_utils_AIUpdated import execute_stored_procedure


class UserStoriesView(APIView):
    """
    API endpoint to retrieve stories for a user's home feed.
    """
    def __init__(self, **kwargs):
        super(UserStoriesView, self).__init__(**kwargs)
        from cheerios.connection_manager import ConnectionManager
        self.connection_manager = ConnectionManager

    def get(self, request):
        """
        Get stories for the user's home feed.
        
        Query Parameters:
        - user_id: ID of the user (required)
        - cursor: Pagination cursor (optional)
        - limit: Number of records to return (optional, default: 20)
        """
        try:
            # Get parameters from request
            user_id = request.query_params.get('user_id')
            cursor = request.query_params.get('cursor')
            limit = request.query_params.get('limit', 20)
            
            # Validate user_id
            if not user_id:
                return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user_id = int(user_id)
                limit = int(limit)
            except ValueError:
                return Response({'error': 'Invalid user_id or limit parameter'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare parameters for stored procedure
            parameters = {
                'UserID': user_id,
                'Cursor': cursor if cursor else None,
                'Limit': limit
            }
            
            logging.warning(f"DEBUG - UserStoriesView: Fetching stories with parameters: {parameters}")
            
            # Call the stored procedure
            response = execute_stored_procedure(STORED_PROCEDURE_MAPPER['user_stories'], parameters, self.connection_manager)
            
            # Process the response
            if response.status_code == 200:
                # The stored procedure returns two result sets:
                # 1. The stories
                # 2. Pagination info (nextCursor, hasMore)
                
                stories = []
                pagination = {}
                
                if isinstance(response.data, list):
                    # Find where the pagination info starts
                    pagination_index = -1
                    for i, item in enumerate(response.data):
                        if 'nextCursor' in item or 'hasMore' in item:
                            pagination_index = i
                            break
                    
                    if pagination_index > 0:
                        stories = response.data[:pagination_index]
                        if pagination_index < len(response.data):
                            pagination = response.data[pagination_index]
                    else:
                        stories = response.data
                
                result = {
                    'stories': stories,
                    'pagination': pagination
                }
                
                logging.warning(f"DEBUG - UserStoriesView: Returning {len(stories)} stories")
                return Response(result, status=status.HTTP_200_OK)
            else:
                logging.error(f"DEBUG - UserStoriesView: Error from stored procedure: {response.data}")
                return Response({'error': 'Failed to retrieve stories'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logging.error(f"DEBUG - UserStoriesView: Error: {str(e)}")
            return Response({'error': f'Error retrieving stories: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
