USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Adds a comment to a buddy post
-- Returns: The ID of the created comment as a result set
-- =============================================
CREATE PROCEDURE [dbo].[usp_ins_BuddyPostComment]
    @UserID bigint,
    @PostID bigint,
    @CommentText nvarchar(1000)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ReturnCode int = 0
    DECLARE @CommentID int = NULL
    
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
    
    IF @CommentText IS NULL OR LEN(LTRIM(RTRIM(@CommentText))) = 0
    BEGIN
        RAISERROR('Comment text is required', 16, 1)
        SET @ReturnCode = -3
        GOTO ReturnResults
    END
    
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbMembers] WHERE PlayerID = @UserID)
    BEGIN
        RAISERROR('User does not exist', 16, 1)
        SET @ReturnCode = -4
        GOTO ReturnResults
    END
    
    -- Validate post exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbBuddyPosts] WHERE PostID = @PostID)
    BEGIN
        RAISERROR('Post does not exist', 16, 1)
        SET @ReturnCode = -5
        GOTO ReturnResults
    END
    
    -- Insert the comment
    INSERT INTO [dbo].[tbBuddyPostComments]
    (
        [UserID],
        [PostID],
        [CommentText],
        [CreatedDate],
        [Status]
    )
    VALUES
    (
        @UserID,
        @PostID,
        @CommentText,
        GETDATE(),
        'active'
    )
    
    -- Get the ID of the inserted comment
    SET @CommentID = SCOPE_IDENTITY()
    
ReturnResults:
    -- Return the result code as a return value
    -- Applications can check @@ERROR or the return value for error handling
    
    -- Return the CommentID as a result set that can be retrieved by the calling application
    SELECT @CommentID AS CommentID, @ReturnCode AS ReturnCode
    
    -- Also return the status code for backward compatibility
    RETURN @ReturnCode
END
GO
