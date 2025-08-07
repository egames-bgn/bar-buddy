USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Creates or toggles a like on a buddy post
-- Returns: The status of the like operation (1=liked, 0=unliked)
-- =============================================
CREATE PROCEDURE [dbo].[usp_ins_BuddyPostLike]
    @UserID bigint,
    @PostID bigint
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ReturnCode int = 0
    DECLARE @LikeStatus bit = 0
    
    -- Input validation
    IF @UserID IS NULL
    BEGIN
        RAISERROR('UserID is required', 16, 1)
        SET @ReturnCode = -1
        GOTO ReturnResults
    END
    
    IF @PostID IS NULL
    BEGIN
        RAISERROR('PostID is required', 16, 1)
        SET @ReturnCode = -2
        GOTO ReturnResults
    END
    
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbMembers] WHERE PlayerID = @UserID)
    BEGIN
        RAISERROR('User does not exist', 16, 1)
        SET @ReturnCode = -3
        GOTO ReturnResults
    END
    
    -- Validate post exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbBuddyPosts] WHERE PostID = @PostID)
    BEGIN
        RAISERROR('Post does not exist', 16, 1)
        SET @ReturnCode = -4
        GOTO ReturnResults
    END
    
    -- Check if like already exists
    IF EXISTS (SELECT 1 FROM [dbo].[tbBuddyPostLikes] WHERE UserID = @UserID AND PostID = @PostID)
    BEGIN
        -- Unlike: Remove the existing like
        DELETE FROM [dbo].[tbBuddyPostLikes]
        WHERE UserID = @UserID AND PostID = @PostID
        
        SET @LikeStatus = 0 -- Unliked
    END
    ELSE
    BEGIN
        -- Like: Add a new like
        INSERT INTO [dbo].[tbBuddyPostLikes]
        (
            [UserID],
            [PostID],
            [CreatedDate]
        )
        VALUES
        (
            @UserID,
            @PostID,
            GETDATE()
        )
        
        SET @LikeStatus = 1 -- Liked
    END
    
ReturnResults:
    -- Return the result code as a return value
    -- Applications can check @@ERROR or the return value for error handling
    
    -- Return the like status as a result set that can be retrieved by the calling application
    SELECT @LikeStatus AS LikeStatus, @ReturnCode AS ReturnCode
    
    -- Also return the status code for backward compatibility
    RETURN @ReturnCode
END
GO
