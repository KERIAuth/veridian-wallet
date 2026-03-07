import { Box, Button, Card, CardContent, Typography, Alert, CircularProgress } from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useNavigate } from "react-router";
import { useKERIAuth } from "../../components/AuthContext";
import { useEffect } from "react";
import "./Auth.scss";

const Auth = () => {
  const navigate = useNavigate();
  const { isExtensionInstalled, isAuthorized, aid, authorize, loading, error, extensionName } = useKERIAuth();

  // Redirect if already authorized
  useEffect(() => {
    if (isAuthorized && aid) {
      // Use setTimeout to ensure navigation happens after current render cycle completes
      const timer = setTimeout(() => {
        navigate("/credentials", { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthorized, aid, navigate]);

  const handleAuthorize = async () => {
    try {
      await authorize("Authorize access to Credential Issuance");
      // After successful authorization, the useEffect will handle navigation
    } catch (err) {
      // Error is already handled in context
      console.error("Authorization failed:", err);
    }
  };

  return (
    <Box className="auth-page">
      <Box className="auth-container">
        <Card className="auth-card" elevation={3}>
          <CardContent>
            {/* Header */}
            <Box className="auth-header">
              <LockOpenIcon className="auth-icon" />
              <Typography variant="h4" component="h1" gutterBottom>
                Connect Your Wallet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sign in with {extensionName} to continue
              </Typography>
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Authorization Button */}
            <Box className="auth-actions">
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleAuthorize}
                disabled={!isExtensionInstalled || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LockOpenIcon />}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </Button>

              {!isExtensionInstalled && (
                <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                  {extensionName} extension required
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export { Auth };

