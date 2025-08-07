
class UserStoriesView(MSSQLApiView):
    """
    API endpoint to retrieve stories for a user's home feed.
    """
    def get(self, request):
        """
        Get stories for the user's home feed.
        
        Query Parameters:
        - UserID: ID of the user (required)
        - Cursor: Pagination cursor (optional)
        - Limit: Number of records to return (optional, default: 20)
        """
        # Get parameters from request
        user_id = request.query_params.get('UserID')
        cursor = request.query_params.get('Cursor')
        limit = request.query_params.get('Limit', '20')
        
        # Validate user_id
        if not user_id:
            return Response({'error': 'Missing required parameter: UserID'}, status=400)
        
        # Prepare parameters for stored procedure
        parameters = {
            'UserID': user_id,
            'Cursor': cursor,
            'Limit': limit
        }
        
        logging.warning(f"DEBUG - UserStoriesView: Fetching stories with parameters: {parameters}")
        
        # Call the stored procedure
        response = execute_stored_procedure(
            STORED_PROCEDURE_MAPPER['user_stories'],
            parameters,
            self.connection_manager
        )
        
        # Format the response for frontend pagination
        if response.status_code == 200 and isinstance(response.data, list):
            # Process the response
            stories = []
            pagination = {}
            
            # Find where the pagination info starts
            pagination_index = -1
            for i, item in enumerate(response.data):
                if isinstance(item, dict) and ('nextCursor' in item or 'hasMore' in item):
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
            return Response(result, status=200)
        
        # If we get here, something went wrong
        return response
