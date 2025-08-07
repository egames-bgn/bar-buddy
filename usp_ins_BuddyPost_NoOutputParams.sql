USE [dbPlayerPlus]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Description: Stores a new buddy post (photo or check-in)
-- Returns: The ID of the created post as a result set
-- =============================================
CREATE PROCEDURE [dbo].[usp_ins_BuddyPost]
    @UserID bigint,
    @PostType varchar(20),                -- 'photo' or 'checkin'
    @PostContent nvarchar(2000) = NULL,   -- Caption or check-in text
    @LocationID nvarchar(100) = NULL,     -- NULL if location is hidden
    @LocationName nvarchar(255) = NULL,   -- NULL if location is hidden
    @IsLocationHidden bit = 0,
    @PhotoURL nvarchar(500) = NULL,       -- Required for photo posts, NULL for check-ins
    @PhotoStoragePath nvarchar(500) = NULL -- Required for photo posts, NULL for check-ins
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ReturnCode int = 0
    DECLARE @PostID int = NULL
    
    -- Input validation
    IF @UserID IS NULL
    BEGIN
        RAISERROR('UserID is required', 16, 1)
        SET @ReturnCode = -1
        GOTO ReturnResults
    END
    
    IF @PostType IS NULL OR (@PostType <> 'photo' AND @PostType <> 'checkin')
    BEGIN
        RAISERROR('PostType must be either "photo" or "checkin"', 16, 1)
        SET @ReturnCode = -2
        GOTO ReturnResults
    END
    
    -- For photo posts, validate photo URL
    IF @PostType = 'photo' AND (@PhotoURL IS NULL OR @PhotoStoragePath IS NULL)
    BEGIN
        RAISERROR('Photo URL and storage path are required for photo posts', 16, 1)
        SET @ReturnCode = -3
        GOTO ReturnResults
    END
    
    -- Validate location data consistency
    IF @IsLocationHidden = 1 AND (@LocationID IS NOT NULL OR @LocationName IS NOT NULL)
    BEGIN
        -- If location is hidden, clear location data
        SET @LocationID = NULL
        SET @LocationName = NULL
    END
    ELSE IF @IsLocationHidden = 0 AND (@LocationID IS NULL OR @LocationName IS NULL)
    BEGIN
        -- If location is not hidden, both ID and name are required
        RAISERROR('Both LocationID and LocationName are required when location is not hidden', 16, 1)
        SET @ReturnCode = -4
        GOTO ReturnResults
    END
    
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM [dbo].[tbMembers] WHERE PlayerID = @UserID)
    BEGIN
        RAISERROR('User does not exist', 16, 1)
        SET @ReturnCode = -5
        GOTO ReturnResults
    END
    
    -- Insert the post
    INSERT INTO [dbo].[tbBuddyPosts]
    (
        [UserID],
        [PostType],
        [PostContent],
        [LocationID],
        [LocationName],
        [IsLocationHidden],
        [PhotoURL],
        [PhotoStoragePath],
        [CreatedDate],
        [Status]
    )
    VALUES
    (
        @UserID,
        @PostType,
        @PostContent,
        @LocationID,
        @LocationName,
        @IsLocationHidden,
        @PhotoURL,
        @PhotoStoragePath,
        GETDATE(),
        'active'
    )
    
    -- Get the ID of the inserted post
    SET @PostID = SCOPE_IDENTITY()
    
ReturnResults:
    -- Return the result code as a return value
    -- Applications can check @@ERROR or the return value for error handling
    
    -- Return the PostID as a result set that can be retrieved by the calling application
    SELECT @PostID AS PostID, @ReturnCode AS ReturnCode
    
    -- Also return the status code for backward compatibility
    RETURN @ReturnCode
END
GO
