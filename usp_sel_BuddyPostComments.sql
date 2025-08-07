USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Retrieves comments for a buddy post
-- Returns: Comments with user information
-- =============================================
CREATE PROCEDURE [dbo].[usp_sel_BuddyPostComments]
    @PostID bigint,
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
    
    -- Retrieve comments with user information
    SELECT 
        c.CommentID,
        c.PostID,
        c.UserID,
        m.DisplayName AS Username,
        c.CommentText,
        c.CreatedDate,
        c.Status
    FROM 
        [dbo].[tbBuddyPostComments] c
    INNER JOIN 
        [dbo].[tbMembers] m ON c.UserID = m.PlayerID
    WHERE 
        c.PostID = @PostID
        AND c.Status = 'active'
    ORDER BY 
        c.CreatedDate DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
    
    -- Return total count for pagination
    SELECT COUNT(*) AS TotalComments
    FROM [dbo].[tbBuddyPostComments]
    WHERE PostID = @PostID AND Status = 'active';
    
    RETURN 0
END
GO
