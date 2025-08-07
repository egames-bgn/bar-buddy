USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Retrieves stories for a user's home feed, including their own posts and posts from buddies
-- Returns: Stories in descending order of modified date (or created date if modified date is null)
-- =============================================
CREATE PROCEDURE [dbo].[usp_sel_UserStories]
    @UserID BIGINT,                    -- ID of the current user
    @Cursor VARCHAR(100) = NULL,       -- Cursor for pagination (format: 'SortDate_PostID')
    @Limit INT = 20                    -- Number of records to return
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parse cursor if provided
    DECLARE @CursorSortDate DATETIME;
    DECLARE @CursorPostID BIGINT;
    
    IF @Cursor IS NOT NULL
    BEGIN
        SET @CursorSortDate = CAST(SUBSTRING(@Cursor, 1, CHARINDEX('_', @Cursor) - 1) AS DATETIME);
        SET @CursorPostID = CAST(SUBSTRING(@Cursor, CHARINDEX('_', @Cursor) + 1, LEN(@Cursor)) AS BIGINT);
    END
    ELSE
    BEGIN
        SET @CursorSortDate = '9999-12-31';
        SET @CursorPostID = 9223372036854775807; -- Max BIGINT value
    END
    
    -- Create temp table for results
    CREATE TABLE #UserStories (
        PostID BIGINT,
        UserID BIGINT,
        Username NVARCHAR(100),
        PostType VARCHAR(20),
        PostContent NVARCHAR(2000),
        LocationID NVARCHAR(100),
        LocationName NVARCHAR(255),
        IsLocationHidden BIT,
        PhotoURL NVARCHAR(500),
        CreatedDate DATETIME,
        ModifiedDate DATETIME,
        SortDate DATETIME,
        Status VARCHAR(20)
    );
    
    -- Get the list of buddy IDs for the current user
    CREATE TABLE #Buddies (
        BuddyID BIGINT
    );
    
    -- Insert the current user's buddies
    INSERT INTO #Buddies (BuddyID)
    SELECT TargetUserID
    FROM [dbo].[tbBuddies]
    WHERE UserID = @UserID AND Status = 'accepted';
    
    -- Insert the current user's ID as well (to include their own posts)
    INSERT INTO #Buddies (BuddyID)
    VALUES (@UserID);
    
    -- Get stories from the user and their buddies
    INSERT INTO #UserStories (
        PostID, UserID, Username, PostType, PostContent, 
        LocationID, LocationName, IsLocationHidden,
        PhotoURL, CreatedDate, ModifiedDate, SortDate, Status
    )
    SELECT TOP (@Limit + 1) -- Get one extra to determine if there are more results
        p.PostID,
        p.UserID,
        COALESCE(m.Handle, 'USER' + CAST(p.UserID AS VARCHAR(10))) AS Username,
        p.PostType,
        p.PostContent,
        p.LocationID,
        p.LocationName,
        p.IsLocationHidden,
        p.PhotoURL,
        p.CreatedDate,
        p.ModifiedDate,
        -- Use ModifiedDate for sorting if available, otherwise use CreatedDate
        COALESCE(p.ModifiedDate, p.CreatedDate) AS SortDate,
        p.Status
    FROM [dbo].[tbBuddyPosts] p
    INNER JOIN #Buddies b ON p.UserID = b.BuddyID
    LEFT JOIN [dbo].[tbMembers] m ON p.UserID = m.PlayerID
    WHERE 
        -- Only include active posts
        p.Status = 'active'
        
        -- Implement cursor-based pagination
        AND (
            COALESCE(p.ModifiedDate, p.CreatedDate) < @CursorSortDate
            OR (COALESCE(p.ModifiedDate, p.CreatedDate) = @CursorSortDate AND p.PostID < @CursorPostID)
        )
    ORDER BY 
        COALESCE(p.ModifiedDate, p.CreatedDate) DESC, 
        p.PostID DESC;
    
    -- Determine if there are more results
    DECLARE @HasMore BIT = 0;
    DECLARE @ResultCount INT = (SELECT COUNT(*) FROM #UserStories);
    
    IF @ResultCount > @Limit
    BEGIN
        SET @HasMore = 1;
        
        -- Remove the extra record we fetched
        WITH Numbered AS (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY SortDate DESC, PostID DESC) AS RowNum,
                *
            FROM #UserStories
        )
        DELETE FROM Numbered WHERE RowNum > @Limit;
    END
    
    -- Get the next cursor
    DECLARE @NextCursor VARCHAR(100) = NULL;
    
    IF @HasMore = 1
    BEGIN
        SELECT TOP 1 @NextCursor = CONVERT(VARCHAR(100), SortDate, 121) + '_' + CAST(PostID AS VARCHAR(20))
        FROM #UserStories
        ORDER BY SortDate ASC, PostID ASC;
    END
    
    -- Return the results
    SELECT 
        PostID,
        UserID,
        Username,
        PostType,
        PostContent,
        LocationID,
        LocationName,
        IsLocationHidden,
        PhotoURL,
        CreatedDate,
        ModifiedDate,
        Status
    FROM #UserStories
    ORDER BY SortDate DESC, PostID DESC;
    
    -- Return the pagination info
    SELECT 
        @NextCursor AS nextCursor,
        @HasMore AS hasMore;
    
    -- Clean up
    DROP TABLE #UserStories;
    DROP TABLE #Buddies;
END
GO
