export const generateOtp = () => {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};
