USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Retrieves likes for a buddy post
-- Returns: Like count and user information
-- =============================================
CREATE PROCEDURE [dbo].[usp_sel_BuddyPostLikes]
    @PostID bigint,
    @UserID bigint = NULL,
    @Limit int = 50,
    @Offset int = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Input validation
    IF @PostID IS NULL
    BEGIN
        RAISERROR('PostID is required', 16, 1)
        RETURN -1
    END
    
    -- Validate post exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbBuddyPosts] WHERE PostID = @PostID)
    BEGIN
        RAISERROR('Post does not exist', 16, 1)
        RETURN -2
    END
    
    -- Set default values for pagination
    IF @Limit IS NULL OR @Limit <= 0
        SET @Limit = 50
    
    IF @Offset IS NULL OR @Offset < 0
        SET @Offset = 0
    
    -- Return whether the requesting user has liked the post (if UserID is provided)
    IF @UserID IS NOT NULL
    BEGIN
        SELECT 
            CASE WHEN EXISTS (
                SELECT 1 
                FROM [dbo].[tbBuddyPostLikes] 
                WHERE PostID = @PostID AND UserID = @UserID
            ) 
            THEN 1 ELSE 0 END AS UserHasLiked
    END
    
    -- Return total like count
    SELECT COUNT(*) AS LikeCount
    FROM [dbo].[tbBuddyPostLikes]
    WHERE PostID = @PostID;
    
    -- Retrieve users who liked the post
    SELECT 
        l.UserID,
        m.DisplayName AS Username,
        l.CreatedDate
    FROM 
        [dbo].[tbBuddyPostLikes] l
    INNER JOIN 
        [dbo].[tbMembers] m ON l.UserID = m.PlayerID
    WHERE 
        l.PostID = @PostID
    ORDER BY 
        l.CreatedDate DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
    
    RETURN 0
END
GO
